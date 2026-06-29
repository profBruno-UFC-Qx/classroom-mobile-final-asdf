package com.cofifinance.mobile.data.repository

import com.cofifinance.mobile.data.local.dao.SpendingDao
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.data.local.entity.toCreateRequest
import com.cofifinance.mobile.data.local.entity.toEntity
import com.cofifinance.mobile.data.local.entity.toUpdateRequest
import com.cofifinance.mobile.data.remote.api.SpendingApiService
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SpendingRepository @Inject constructor(
    private val api: SpendingApiService,
    private val dao: SpendingDao,
) {
    val spendings: Flow<List<SpendingEntity>> = dao.getAllFlow()

    suspend fun sync() {
        push()
        pull()
    }

    suspend fun createSpending(
        name: String,
        category: String,
        price: Double,
        observation: String? = null,
        spentAt: String? = null,
    ) {
        val now = nowIso8601()
        dao.upsert(
            SpendingEntity(
                id = UUID.randomUUID().toString(),
                userId = 0L,
                name = name,
                category = category,
                price = price,
                observation = observation,
                spentAt = spentAt ?: now,
                orderNumber = 0,
                createdAt = now,
                updatedAt = now,
                syncStatus = SyncStatus.PENDING_CREATE,
            )
        )
        sync()
    }

    suspend fun updateSpending(
        id: String,
        name: String,
        category: String,
        price: Double,
        observation: String? = null,
        spentAt: String,
    ) {
        val existing = dao.getById(id) ?: return
        dao.upsert(
            existing.copy(
                name = name,
                category = category,
                price = price,
                observation = observation,
                spentAt = spentAt,
                updatedAt = nowIso8601(),
                syncStatus = SyncStatus.PENDING_UPDATE,
            )
        )
        sync()
    }

    suspend fun getSpendingById(id: String): SpendingEntity? = dao.getById(id)

    suspend fun deleteSpending(id: String) {
        dao.updateSyncStatus(id, SyncStatus.PENDING_DELETE)
        sync()
    }

    private suspend fun push() {
        for (item in dao.getPending()) {
            when (item.syncStatus) {
                SyncStatus.PENDING_CREATE -> {
                    val result = runCatching { api.createSpending(item.toCreateRequest()).data }
                    result.getOrNull()?.let { remote ->
                        dao.deleteById(item.id)
                        dao.upsert(remote.toEntity(SyncStatus.SYNCED))
                    }
                }
                SyncStatus.PENDING_UPDATE -> {
                    val result = runCatching { api.updateSpending(item.id, item.toUpdateRequest()) }
                    if (result.isSuccess) dao.updateSyncStatus(item.id, SyncStatus.SYNCED)
                }
                SyncStatus.PENDING_DELETE -> {
                    val result = runCatching { api.deleteSpending(item.id) }
                    if (result.isSuccess) dao.deleteById(item.id)
                }
                SyncStatus.SYNCED -> {}
            }
        }
    }

    private suspend fun pull() {
        val remoteItems = runCatching { api.listSpendings().data }.getOrNull() ?: return
        val pendingIds = dao.getPending().map { it.id }.toSet()

        val toUpsert = remoteItems
            .filter { it.id !in pendingIds }
            .map { it.toEntity(SyncStatus.SYNCED) }
        if (toUpsert.isNotEmpty()) dao.upsertAll(toUpsert)

        val remoteIds = remoteItems.map { it.id }.toSet()
        val toDelete = dao.getAll()
            .filter { it.syncStatus == SyncStatus.SYNCED && it.id !in remoteIds }
            .map { it.id }
        if (toDelete.isNotEmpty()) dao.deleteByIds(toDelete)
    }
}

private fun nowIso8601(): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
    .also { it.timeZone = TimeZone.getTimeZone("UTC") }
    .format(Date())

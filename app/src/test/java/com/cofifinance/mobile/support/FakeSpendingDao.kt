package com.cofifinance.mobile.support

import com.cofifinance.mobile.data.local.dao.SpendingDao
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

class FakeSpendingDao : SpendingDao {

    private val store = mutableListOf<SpendingEntity>()
    private val _flow = MutableStateFlow<List<SpendingEntity>>(emptyList())

    private fun publish() {
        _flow.value = store
            .filter { it.syncStatus != SyncStatus.PENDING_DELETE }
            .sortedByDescending { it.spentAt }
    }

    override fun getAllFlow(): Flow<List<SpendingEntity>> = _flow

    override suspend fun getAll(): List<SpendingEntity> = store.toList()

    override suspend fun getById(id: String): SpendingEntity? = store.find { it.id == id }

    override suspend fun getPending(): List<SpendingEntity> =
        store.filter { it.syncStatus != SyncStatus.SYNCED }

    override suspend fun upsert(entity: SpendingEntity) {
        store.removeAll { it.id == entity.id }
        store.add(entity)
        publish()
    }

    override suspend fun upsertAll(entities: List<SpendingEntity>) {
        entities.forEach { entity ->
            store.removeAll { it.id == entity.id }
            store.add(entity)
        }
        publish()
    }

    override suspend fun deleteById(id: String) {
        store.removeAll { it.id == id }
        publish()
    }

    override suspend fun deleteByIds(ids: List<String>) {
        store.removeAll { it.id in ids }
        publish()
    }

    override suspend fun updateSyncStatus(id: String, status: SyncStatus) {
        val idx = store.indexOfFirst { it.id == id }
        if (idx >= 0) {
            store[idx] = store[idx].copy(syncStatus = status)
            publish()
        }
    }
}

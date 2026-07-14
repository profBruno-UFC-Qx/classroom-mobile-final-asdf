package com.cofifinance.mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.cofifinance.mobile.data.remote.dto.CreateSpendingRequest
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.remote.dto.UpdateSpendingRequest

enum class SyncStatus { SYNCED, PENDING_CREATE, PENDING_UPDATE, PENDING_DELETE }

class SyncStatusConverter {
    @TypeConverter fun toName(status: SyncStatus): String = status.name
    @TypeConverter fun fromName(name: String): SyncStatus = SyncStatus.valueOf(name)
}

@Entity(tableName = "spendings")
@TypeConverters(SyncStatusConverter::class)
data class SpendingEntity(
    @PrimaryKey val id: String,
    val userId: Long,
    val name: String,
    val category: String,
    val price: Double,
    val observation: String?,
    val spentAt: String,
    val orderNumber: Int,
    val createdAt: String,
    val updatedAt: String,
    val syncStatus: SyncStatus,
)

fun SpendingDto.toEntity(syncStatus: SyncStatus) = SpendingEntity(
    id = id,
    userId = userId,
    name = name,
    category = category,
    price = price,
    observation = observation,
    spentAt = spentAt,
    orderNumber = orderNumber,
    createdAt = createdAt,
    updatedAt = updatedAt,
    syncStatus = syncStatus,
)

fun SpendingEntity.toCreateRequest() = CreateSpendingRequest(
    name = name,
    category = category,
    price = price,
    observation = observation,
    spentAt = spentAt,
)

fun SpendingEntity.toUpdateRequest() = UpdateSpendingRequest(
    name = name,
    category = category,
    price = price,
    observation = observation,
    spentAt = spentAt,
)

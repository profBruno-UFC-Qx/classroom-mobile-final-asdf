package com.cofifinance.mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface SpendingDao {

    @Query("SELECT * FROM spendings WHERE syncStatus != 'PENDING_DELETE' ORDER BY spentAt DESC")
    fun getAllFlow(): Flow<List<SpendingEntity>>

    @Query("SELECT * FROM spendings")
    suspend fun getAll(): List<SpendingEntity>

    @Query("SELECT * FROM spendings WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SpendingEntity?

    @Query("SELECT * FROM spendings WHERE syncStatus != 'SYNCED'")
    suspend fun getPending(): List<SpendingEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: SpendingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<SpendingEntity>)

    @Query("DELETE FROM spendings WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM spendings WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<String>)

    @Query("UPDATE spendings SET syncStatus = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: SyncStatus)
}

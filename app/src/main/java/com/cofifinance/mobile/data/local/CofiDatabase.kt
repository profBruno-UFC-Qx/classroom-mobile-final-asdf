package com.cofifinance.mobile.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.cofifinance.mobile.data.local.dao.SpendingDao
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatusConverter

@Database(entities = [SpendingEntity::class], version = 1, exportSchema = false)
@TypeConverters(SyncStatusConverter::class)
abstract class CofiDatabase : RoomDatabase() {
    abstract fun spendingDao(): SpendingDao
}

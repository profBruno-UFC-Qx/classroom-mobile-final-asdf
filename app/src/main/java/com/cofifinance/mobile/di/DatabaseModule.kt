package com.cofifinance.mobile.di

import android.content.Context
import androidx.room.Room
import com.cofifinance.mobile.data.local.CofiDatabase
import com.cofifinance.mobile.data.local.dao.SpendingDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): CofiDatabase =
        Room.databaseBuilder(context, CofiDatabase::class.java, "cofi_database")
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()

    @Provides
    fun provideSpendingDao(db: CofiDatabase): SpendingDao = db.spendingDao()
}

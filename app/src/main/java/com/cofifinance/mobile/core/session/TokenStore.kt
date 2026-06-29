package com.cofifinance.mobile.core.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    private val accessKey = stringPreferencesKey("access_token")
    private val refreshKey = stringPreferencesKey("refresh_token")

    val tokens: Flow<TokenPair?> = dataStore.data.map { prefs ->
        val access = prefs[accessKey]
        val refresh = prefs[refreshKey]
        if (access.isNullOrEmpty() || refresh.isNullOrEmpty()) null
        else TokenPair(access, refresh)
    }

    suspend fun save(pair: TokenPair) {
        dataStore.edit { prefs ->
            prefs[accessKey] = pair.accessToken
            prefs[refreshKey] = pair.refreshToken
        }
    }

    suspend fun clear() {
        dataStore.edit { prefs ->
            prefs.remove(accessKey)
            prefs.remove(refreshKey)
        }
    }
}

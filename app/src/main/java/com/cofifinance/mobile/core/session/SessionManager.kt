package com.cofifinance.mobile.core.session

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    private val tokenStore: TokenStore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _state = MutableStateFlow<AuthState>(AuthState.Loading)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        scope.launch {
            tokenStore.tokens.collect { pair ->
                _state.value = if (pair == null) AuthState.Unauthenticated
                else AuthState.Authenticated(pair)
            }
        }
    }

    fun currentAccessToken(): String? =
        (state.value as? AuthState.Authenticated)?.tokens?.accessToken

    fun currentRefreshToken(): String? =
        (state.value as? AuthState.Authenticated)?.tokens?.refreshToken

    suspend fun onTokensIssued(pair: TokenPair) {
        tokenStore.save(pair)
    }

    suspend fun onLogout() {
        tokenStore.clear()
    }
}

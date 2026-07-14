package com.cofifinance.mobile.data.remote.network

import com.cofifinance.mobile.core.session.SessionManager
import com.cofifinance.mobile.data.remote.api.AuthApiService
import com.cofifinance.mobile.data.remote.dto.RenewRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider

class TokenAuthenticator @Inject constructor(
    private val authApi: Provider<AuthApiService>,
    private val session: SessionManager,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = session.currentRefreshToken() ?: return null

        val newPair = runCatching {
            runBlocking { authApi.get().renew(RenewRequest(refresh)) }.data
        }.getOrElse {
            runBlocking { session.onLogout() }
            return null
        }

        runBlocking { session.onTokensIssued(newPair.toDomain()) }

        return response.request.newBuilder()
            .header("Authorization", "Bearer ${newPair.accessToken}")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}

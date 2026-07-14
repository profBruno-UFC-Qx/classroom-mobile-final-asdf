package com.cofifinance.mobile.data.remote.network

import com.cofifinance.mobile.core.session.SessionManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class AuthInterceptor @Inject constructor(
    private val session: SessionManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.header("Authorization") != null || isAuthEndpoint(request.url.encodedPath)) {
            return chain.proceed(request)
        }
        val token = session.currentAccessToken() ?: return chain.proceed(request)
        val authed = request.newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return chain.proceed(authed)
    }

    private fun isAuthEndpoint(path: String): Boolean =
        path.endsWith("/auth/login") ||
            path.endsWith("/auth/register") ||
            path.endsWith("/auth/renew")
}

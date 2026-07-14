package com.cofifinance.mobile.support

import com.cofifinance.mobile.data.remote.api.AuthApiService
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.LoginRequest
import com.cofifinance.mobile.data.remote.dto.RegisterRequest
import com.cofifinance.mobile.data.remote.dto.RenewRequest
import com.cofifinance.mobile.data.remote.dto.TokenPairDto
import retrofit2.Response

class FakeAuthApiService : AuthApiService {

    val loginCalls = mutableListOf<LoginRequest>()
    val registerCalls = mutableListOf<RegisterRequest>()
    val renewCalls = mutableListOf<RenewRequest>()
    val logoutCalls = mutableListOf<RenewRequest?>()

    var loginHandler: suspend (LoginRequest) -> ApiEnvelope<TokenPairDto> =
        { error("loginHandler not set") }
    var registerHandler: suspend (RegisterRequest) -> Response<Unit> =
        { Response.success(null) }
    var renewHandler: suspend (RenewRequest) -> ApiEnvelope<TokenPairDto> =
        { error("renewHandler not set") }
    var logoutHandler: suspend (RenewRequest?) -> Response<Unit> =
        { Response.success(null) }

    override suspend fun login(body: LoginRequest): ApiEnvelope<TokenPairDto> {
        loginCalls += body
        return loginHandler(body)
    }

    override suspend fun register(body: RegisterRequest): Response<Unit> {
        registerCalls += body
        return registerHandler(body)
    }

    override suspend fun renew(body: RenewRequest): ApiEnvelope<TokenPairDto> {
        renewCalls += body
        return renewHandler(body)
    }

    override suspend fun logout(body: RenewRequest?): Response<Unit> {
        logoutCalls += body
        return logoutHandler(body)
    }
}

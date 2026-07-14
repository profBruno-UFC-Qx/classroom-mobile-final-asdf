package com.cofifinance.mobile.data.remote.api

import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.LoginRequest
import com.cofifinance.mobile.data.remote.dto.RegisterRequest
import com.cofifinance.mobile.data.remote.dto.RenewRequest
import com.cofifinance.mobile.data.remote.dto.TokenPairDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiEnvelope<TokenPairDto>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<Unit>

    @POST("auth/renew")
    suspend fun renew(@Body body: RenewRequest): ApiEnvelope<TokenPairDto>

    @POST("auth/logout")
    suspend fun logout(@Body body: RenewRequest?): Response<Unit>
}

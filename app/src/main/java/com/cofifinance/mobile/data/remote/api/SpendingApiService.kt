package com.cofifinance.mobile.data.remote.api

import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.CreateSpendingRequest
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.remote.dto.UpdateSpendingRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface SpendingApiService {

    @GET("spendings")
    suspend fun listSpendings(): ApiEnvelope<List<SpendingDto>>

    @POST("spendings")
    suspend fun createSpending(@Body body: CreateSpendingRequest): ApiEnvelope<SpendingDto>

    @PATCH("spendings/{id}")
    suspend fun updateSpending(
        @Path("id") id: String,
        @Body body: UpdateSpendingRequest,
    ): ApiEnvelope<SpendingDto>

    @DELETE("spendings/{id}")
    suspend fun deleteSpending(@Path("id") id: String): Response<Unit>
}

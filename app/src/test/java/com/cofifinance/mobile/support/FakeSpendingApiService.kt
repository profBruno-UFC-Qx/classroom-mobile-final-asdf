package com.cofifinance.mobile.support

import com.cofifinance.mobile.data.remote.api.SpendingApiService
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.CreateSpendingRequest
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.remote.dto.UpdateSpendingRequest
import retrofit2.Response

class FakeSpendingApiService : SpendingApiService {

    val listCalls = mutableListOf<Unit>()
    val createCalls = mutableListOf<CreateSpendingRequest>()
    val updateCalls = mutableListOf<Pair<String, UpdateSpendingRequest>>()
    val deleteCalls = mutableListOf<String>()

    var listHandler: suspend () -> ApiEnvelope<List<SpendingDto>> = { ApiEnvelope(emptyList()) }
    var createHandler: suspend (CreateSpendingRequest) -> ApiEnvelope<SpendingDto> =
        { error("createHandler not set") }
    var updateHandler: suspend (String, UpdateSpendingRequest) -> ApiEnvelope<SpendingDto> =
        { _, _ -> error("updateHandler not set") }
    var deleteHandler: suspend (String) -> Response<Unit> = { Response.success(null) }

    override suspend fun listSpendings(): ApiEnvelope<List<SpendingDto>> {
        listCalls += Unit
        return listHandler()
    }

    override suspend fun createSpending(body: CreateSpendingRequest): ApiEnvelope<SpendingDto> {
        createCalls += body
        return createHandler(body)
    }

    override suspend fun updateSpending(id: String, body: UpdateSpendingRequest): ApiEnvelope<SpendingDto> {
        updateCalls += id to body
        return updateHandler(id, body)
    }

    override suspend fun deleteSpending(id: String): Response<Unit> {
        deleteCalls += id
        return deleteHandler(id)
    }
}

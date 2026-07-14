package com.cofifinance.mobile.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreateSpendingRequest(
    val name: String,
    val category: String,
    val price: Double,
    val observation: String? = null,
    @SerialName("spent_at") val spentAt: String? = null,
)

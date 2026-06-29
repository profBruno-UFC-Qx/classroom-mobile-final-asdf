package com.cofifinance.mobile.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SpendingDto(
    val id: String,
    @SerialName("user_id") val userId: Long,
    val name: String,
    val category: String,
    val price: Double,
    val observation: String? = null,
    @SerialName("spent_at") val spentAt: String,
    @SerialName("order_number") val orderNumber: Int,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

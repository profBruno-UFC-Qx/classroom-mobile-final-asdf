package com.cofifinance.mobile.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RenewRequest(
    @SerialName("refresh_token") val refreshToken: String,
)

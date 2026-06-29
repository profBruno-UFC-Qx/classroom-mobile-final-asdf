package com.cofifinance.mobile.data.remote.dto

import com.cofifinance.mobile.core.session.TokenPair
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TokenPairDto(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
) {
    fun toDomain(): TokenPair = TokenPair(accessToken, refreshToken)
}

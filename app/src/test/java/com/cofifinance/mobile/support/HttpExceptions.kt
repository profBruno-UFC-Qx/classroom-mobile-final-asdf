package com.cofifinance.mobile.support

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import retrofit2.Response

fun httpException(code: Int): HttpException =
    HttpException(errorResponse<Any>(code))

fun <T> errorResponse(code: Int): Response<T> =
    Response.error(code, "".toResponseBody("application/json".toMediaType()))

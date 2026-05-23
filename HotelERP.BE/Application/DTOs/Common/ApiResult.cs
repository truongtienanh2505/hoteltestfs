using System.Text.Json.Serialization;

namespace HotelERP.BE.DTOs.Common;

public class ApiResult<T>
{
    [JsonIgnore]
    public int StatusCode { get; init; }

    public bool Success { get; init; }

    public string Code { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;

    public T? Data { get; init; }

    public object? Details { get; init; }
    public object? Result { get; internal set; }

    public static ApiResult<T> Ok(T? data, string message = "Success", string code = "SUCCESS")
    {
        return new ApiResult<T>
        {
            StatusCode = StatusCodes.Status200OK,
            Success = true,
            Code = code,
            Message = message,
            Data = data,
            Details = null
        };
    }

    public static ApiResult<T> Created(T? data, string message = "Created", string code = "CREATED")
    {
        return new ApiResult<T>
        {
            StatusCode = StatusCodes.Status201Created,
            Success = true,
            Code = code,
            Message = message,
            Data = data,
            Details = null
        };
    }

    public static ApiResult<T> Fail(int statusCode, string code, string message, object? details = null)
    {
        return new ApiResult<T>
        {
            StatusCode = statusCode,
            Success = false,
            Code = code,
            Message = message,
            Data = default,
            Details = details
        };
    }
}
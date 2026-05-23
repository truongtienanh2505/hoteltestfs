using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace HotelERP.BE.Utils;

public static class SlugHelper
{
    // Chuyển "Khuyến mãi mùa hè" -> "khuyen-mai-mua-he"
    public static string GenerateSlug(string phrase)
    {
        if (string.IsNullOrWhiteSpace(phrase)) return "";
        
        string str = RemoveDiacritics(phrase).ToLower();
        
        // Bỏ các ký tự không hợp lệ
        str = Regex.Replace(str, @"[^a-z0-9\s-]", "");
        // Đổi khoảng trắng thành gạch ngang
        str = Regex.Replace(str, @"\s+", "-").Trim();
        // Xóa gạch ngang thừa
        str = Regex.Replace(str, @"-+", "-");
        
        return str;
    }

    private static string RemoveDiacritics(string text)
    {
        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                stringBuilder.Append(c);
            }
        }
        
        return stringBuilder.ToString().Normalize(NormalizationForm.FormC)
            .Replace("đ", "d").Replace("Đ", "D");
    }
}
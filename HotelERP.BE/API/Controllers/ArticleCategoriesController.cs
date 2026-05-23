using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HotelERP.BE.Services;
using HotelERP.BE.DTOs;

namespace HotelERP.BE.Controllers;

[Route("api/[controller]")] // Tự động nhận tên là api/ArticleCategories
[ApiController]
public class ArticleCategoriesController : ControllerBase
{
    private readonly ArticleCategoryService _categoryService;

    public ArticleCategoriesController(ArticleCategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _categoryService.GetAllCategoriesAsync();
        return Ok(result);
    }

    [HttpPost]
    [Authorize] // Cần đăng nhập để Thêm
    public async Task<IActionResult> Create([FromBody] ArticleCategoryRequestDto request)
    {
        try
        {
            var newCategory = await _categoryService.CreateCategoryAsync(request);
            return Ok(new { message = "Tạo danh mục thành công", data = newCategory });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize] // Cần đăng nhập để Sửa
    public async Task<IActionResult> Update(int id, [FromBody] ArticleCategoryRequestDto request)
    {
        try
        {
            var updatedCategory = await _categoryService.UpdateCategoryAsync(id, request);
            return Ok(new { message = "Cập nhật thành công", data = updatedCategory });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize] // Cần đăng nhập để Xóa
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _categoryService.DeleteCategoryAsync(id);
            return Ok(new { message = "Xóa danh mục thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
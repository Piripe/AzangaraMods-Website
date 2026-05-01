using AzangaraMods_Website_Back.Models;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class LevelsController : Controller
{
    
    [HttpPut("files")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelFile([FromForm] IFormFile? file)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big"));
        
        if (file.ContentType == "application/octet-stream")
        {
            // .pak
            
        } else if (file.ContentType == "application/zip")
        {
            // .zip
        }
        else
        {
            return BadRequest(new ErrorResponseModel("Invalid file type"));
        }
        
        
        return Ok($"Putting Level File {file.FileName} of size {file.Length} and type {file.ContentType}...");
    }
}
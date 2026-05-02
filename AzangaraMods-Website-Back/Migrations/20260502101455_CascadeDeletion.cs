using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files");

            migrationBuilder.AddForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files",
                column: "LevelId",
                principalTable: "levels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files");

            migrationBuilder.AddForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files",
                column: "LevelId",
                principalTable: "levels",
                principalColumn: "Id");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class LevelPublished : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Published",
                table: "levels",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Published",
                table: "levels");
        }
    }
}

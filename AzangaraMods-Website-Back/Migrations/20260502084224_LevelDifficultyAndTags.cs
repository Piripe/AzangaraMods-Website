using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class LevelDifficultyAndTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Difficulty",
                table: "levels",
                newName: "RealDifficulty");

            migrationBuilder.AlterColumn<string[]>(
                name: "Tags",
                table: "levels",
                type: "varchar(32)[]",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string[]),
                oldType: "text[]",
                oldMaxLength: 8192);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Tags_MaxCount",
                table: "levels",
                sql: "array_length(\"Tags\",1) <= 10");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Tags_MaxCount",
                table: "levels");

            migrationBuilder.RenameColumn(
                name: "RealDifficulty",
                table: "levels",
                newName: "Difficulty");

            migrationBuilder.AlterColumn<string[]>(
                name: "Tags",
                table: "levels",
                type: "text[]",
                maxLength: 8192,
                nullable: false,
                oldClrType: typeof(string[]),
                oldType: "varchar(32)[]",
                oldMaxLength: 32);
        }
    }
}

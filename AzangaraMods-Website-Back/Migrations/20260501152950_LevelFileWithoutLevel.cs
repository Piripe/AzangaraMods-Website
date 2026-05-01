using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class LevelFileWithoutLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files");

            migrationBuilder.AlterColumn<long>(
                name: "LevelId",
                table: "level_files",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "EntryPoint",
                table: "level_files",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128);

            migrationBuilder.AddForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files",
                column: "LevelId",
                principalTable: "levels",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files");

            migrationBuilder.AlterColumn<long>(
                name: "LevelId",
                table: "level_files",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EntryPoint",
                table: "level_files",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128,
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_level_files_levels_LevelId",
                table: "level_files",
                column: "LevelId",
                principalTable: "levels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

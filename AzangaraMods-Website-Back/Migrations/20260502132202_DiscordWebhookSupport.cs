using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class DiscordWebhookSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "DiscordForumMessage",
                table: "levels",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "LevelId",
                table: "level_files",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscordForumMessage",
                table: "levels");

            migrationBuilder.AlterColumn<long>(
                name: "LevelId",
                table: "level_files",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");
        }
    }
}

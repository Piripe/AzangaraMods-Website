using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class LevelVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Verification",
                table: "levels",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VerificationNote",
                table: "levels",
                type: "character varying(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationRequested",
                table: "levels",
                type: "timestamp with time zone",
                nullable: true);

            // Levels published before verification existed count as verified (LevelVerificationStatus.Verified)
            migrationBuilder.Sql("UPDATE levels SET \"Verification\" = 20 WHERE \"Published\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Verification",
                table: "levels");

            migrationBuilder.DropColumn(
                name: "VerificationNote",
                table: "levels");

            migrationBuilder.DropColumn(
                name: "VerificationRequested",
                table: "levels");
        }
    }
}

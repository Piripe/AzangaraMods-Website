using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class TokenSessionInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "Created",
                table: "tokens",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "tokens",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastUsed",
                table: "tokens",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "tokens",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            // Existing tokens get their creation date from their ID (see IdUtils.GetIdDate)
            migrationBuilder.Sql("""
                UPDATE tokens SET "Created" = TIMESTAMPTZ '0001-01-01 00:00:00+00' + make_interval(secs => (("Id" & ~1048575::bigint) >> 3) / 10000000.0);
                UPDATE tokens SET "LastUsed" = "Created";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Created",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "LastUsed",
                table: "tokens");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "tokens");
        }
    }
}

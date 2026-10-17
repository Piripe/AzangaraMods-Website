using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class Reports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reports",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LevelId = table.Column<long>(type: "bigint", nullable: false),
                    LevelFileId = table.Column<long>(type: "bigint", nullable: false),
                    ReporterId = table.Column<long>(type: "bigint", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Message = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    Created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    StatusChanged = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reports_level_files_LevelFileId",
                        column: x => x.LevelFileId,
                        principalTable: "level_files",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reports_levels_LevelId",
                        column: x => x.LevelId,
                        principalTable: "levels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_reports_users_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "site_settings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    ReportsRequireAccount = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_site_settings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "site_settings",
                columns: new[] { "Id", "ReportsRequireAccount" },
                values: new object[] { 1, false });

            migrationBuilder.CreateIndex(
                name: "IX_reports_LevelFileId",
                table: "reports",
                column: "LevelFileId");

            migrationBuilder.CreateIndex(
                name: "IX_reports_LevelId",
                table: "reports",
                column: "LevelId");

            migrationBuilder.CreateIndex(
                name: "IX_reports_ReporterId",
                table: "reports",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_reports_Status_Created",
                table: "reports",
                columns: new[] { "Status", "Created" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reports");

            migrationBuilder.DropTable(
                name: "site_settings");
        }
    }
}

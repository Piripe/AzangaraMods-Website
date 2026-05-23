using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class LevelDifficultyAndRoomAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RealDifficulty",
                table: "levels",
                newName: "Difficulty");

            migrationBuilder.AddColumn<short>(
                name: "RoomAmount",
                table: "levels",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RoomAmount",
                table: "levels");

            migrationBuilder.RenameColumn(
                name: "Difficulty",
                table: "levels",
                newName: "RealDifficulty");
        }
    }
}

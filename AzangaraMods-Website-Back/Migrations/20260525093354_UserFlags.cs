using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AzangaraMods_Website_Back.Migrations
{
    /// <inheritdoc />
    public partial class UserFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VerifiedModder",
                table: "users",
                newName: "Flags");
            
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""Flags"" DROP DEFAULT;");
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""Flags"" TYPE integer USING (""Flags""::int);");
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""Flags"" SET DEFAULT 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Flags",
                table: "users",
                newName: "VerifiedModder");
            
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""VerifiedModder"" DROP DEFAULT;");
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""VerifiedModder"" TYPE boolean USING (""VerifiedModder"" != 0);");
            migrationBuilder.Sql(@"ALTER TABLE users ALTER COLUMN ""VerifiedModder"" SET DEFAULT false;");
        }
    }
}

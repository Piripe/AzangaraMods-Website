using AzangaraMods_Website_Back.Models;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Data;

public class MainDbContext : DbContext
{
    
    public MainDbContext(DbContextOptions<MainDbContext> options) :  base(options) { }
    
    public virtual DbSet<User>? Users { get; set; }
    public virtual DbSet<Token>? Tokens { get; set; }
    public virtual DbSet<Level>? Levels { get; set; }
    public virtual DbSet<GalleryFile>? GalleryFiles { get; set; }
    public virtual DbSet<LevelFile>? LevelFiles { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        /*builder.Entity<User>().Property(u => u.Creation).HasDefaultValueSql("now()");
        builder.Entity<User>().Property(u => u.LastLogin).HasDefaultValueSql("now()");*/
        
        
        
        //builder.Entity<User>().HasMany(e=>e.Tokens).WithOne(t=>t.User).HasForeignKey(t=>t.UserId).HasPrincipalKey(e => e.Id).OnDelete(DeleteBehavior.Cascade).IsRequired();
        //builder
        /*builder.Entity<User>().HasMany(e => e.Connections).WithOne(p => p.User).HasForeignKey(p=> p.UserId).HasPrincipalKey(e=>e.Id).OnDelete(DeleteBehavior.Cascade).IsRequired();
        builder.Entity<Connection>().HasOne(e=>e.User).WithMany(e=>e.Connections).HasForeignKey(e=>e.UserId).IsRequired();*/
    }
}
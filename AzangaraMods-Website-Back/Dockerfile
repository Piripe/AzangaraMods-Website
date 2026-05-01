FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["AzangaraMods-Website-Back/AzangaraMods-Website-Back.csproj", "AzangaraMods-Website-Back/"]
RUN dotnet restore "AzangaraMods-Website-Back/AzangaraMods-Website-Back.csproj"
COPY . .
WORKDIR "/src/AzangaraMods-Website-Back"
RUN dotnet build "./AzangaraMods-Website-Back.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./AzangaraMods-Website-Back.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AzangaraMods-Website-Back.dll"]

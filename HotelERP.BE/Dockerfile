FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["HotelERP.BE/HotelERP.BE.csproj", "HotelERP.BE/"]
RUN dotnet restore "HotelERP.BE/HotelERP.BE.csproj"

COPY . .
WORKDIR "/src/HotelERP.BE"
RUN dotnet publish "HotelERP.BE.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "HotelERP.BE.dll"]

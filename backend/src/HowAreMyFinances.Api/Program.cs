using Amazon.SQS;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Infrastructure;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using HowAreMyFinances.Api.Infrastructure.Repositories;
using HowAreMyFinances.Api.Middleware;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// AWS Lambda hosting
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Configuration
builder.Services
    .AddOptions<SupabaseSettings>()
    .BindConfiguration(SupabaseSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Bank integration settings are optional: without them the Enable Banking endpoints answer 503.
builder.Services.AddOptions<EnableBankingSettings>().BindConfiguration(EnableBankingSettings.SectionName);
builder.Services.AddOptions<SqsSettings>().BindConfiguration(SqsSettings.SectionName);

// CORS — in production API Gateway handles CORS; locally the backend must allow the frontend origin.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? [];

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Repositories
builder.Services.AddScoped<IMonthRepository, MonthRepository>();
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<IIncomeRepository, IncomeRepository>();
builder.Services.AddScoped<IRecurringExpenseRepository, RecurringExpenseRepository>();
builder.Services.AddScoped<IAnalyticsRepository, AnalyticsRepository>();
builder.Services.AddScoped<IVendorRepository, VendorRepository>();
builder.Services.AddScoped<IBankConnectionRepository, BankConnectionRepository>();
builder.Services.AddScoped<IBankTransactionRepository, BankTransactionRepository>();
builder.Services.AddScoped<IAiJobRepository, AiJobRepository>();

// Services
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IMonthService, MonthService>();
builder.Services.AddScoped<IBankSyncService, BankSyncService>();
builder.Services.AddScoped<IAiJobDispatcher, AiJobDispatcher>();
builder.Services.AddSingleton<IAmazonSQS>(_ => new AmazonSQSClient());

// Enable Banking: typed HttpClient with the application JWT attached by a DelegatingHandler
builder.Services.AddSingleton<EnableBankingJwtFactory>();
builder.Services.AddTransient<EnableBankingAuthHandler>();
builder.Services
    .AddHttpClient<IEnableBankingClient, EnableBankingClient>((services, client) =>
    {
        var settings = services.GetRequiredService<IOptions<EnableBankingSettings>>().Value;
        client.BaseAddress = new Uri(settings.BaseUrl);
        client.Timeout = TimeSpan.FromSeconds(25);
    })
    .AddHttpMessageHandler<EnableBankingAuthHandler>();

var app = builder.Build();

// Middleware — order matters: exception handling outermost, then logging, then auth
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseCors();

// In production, API Gateway's Lambda authorizer validates JWTs and passes the user ID
// via the authorizer context. Locally, the app validates JWTs directly.
if (app.Environment.IsDevelopment())
    app.UseMiddleware<AuthMiddleware>();
else
    app.UseMiddleware<AuthorizerContextMiddleware>();

// Health check (public)
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Month endpoints
app.MapGet("/v1/months", MonthFunctions.GetAll);
app.MapGet("/v1/months/{id:guid}", MonthFunctions.GetById);
app.MapPost("/v1/months", MonthFunctions.Create);
app.MapPut("/v1/months/{id:guid}", MonthFunctions.Update);
app.MapDelete("/v1/months/{id:guid}", MonthFunctions.Delete);

// Expense endpoints
app.MapGet("/v1/months/{monthId:guid}/expenses", ExpenseFunctions.GetAll);
app.MapPost("/v1/months/{monthId:guid}/expenses", ExpenseFunctions.Create);
app.MapPut("/v1/expenses/{id:guid}", ExpenseFunctions.Update);
app.MapPatch("/v1/expenses/{id:guid}/toggle-complete", ExpenseFunctions.ToggleComplete);
app.MapDelete("/v1/expenses/{id:guid}", ExpenseFunctions.Delete);

// Vendor endpoints
app.MapGet("/v1/vendors", VendorFunctions.GetAll);
app.MapGet("/v1/vendors/visible", VendorFunctions.GetVisible);
app.MapPatch("/v1/vendors/{id:guid}", VendorFunctions.ToggleHidden);

// Income endpoints
app.MapGet("/v1/months/{monthId:guid}/incomes", IncomeFunctions.GetAll);
app.MapPost("/v1/months/{monthId:guid}/incomes", IncomeFunctions.Create);
app.MapPut("/v1/incomes/{id:guid}", IncomeFunctions.Update);
app.MapDelete("/v1/incomes/{id:guid}", IncomeFunctions.Delete);

// Category endpoints
app.MapGet("/v1/categories/{categoryId:guid}/expenses", ExpenseFunctions.GetByCategory);
app.MapGet("/v1/categories", CategoryFunctions.GetAll);
app.MapPost("/v1/categories", CategoryFunctions.Create);
app.MapPut("/v1/categories/{id:guid}", CategoryFunctions.Update);
app.MapDelete("/v1/categories/{id:guid}", CategoryFunctions.Delete);

// Recurring expense endpoints
app.MapGet("/v1/recurring-expenses", RecurringExpenseFunctions.GetAll);
app.MapPost("/v1/recurring-expenses", RecurringExpenseFunctions.Create);
app.MapPut("/v1/recurring-expenses/{id:guid}", RecurringExpenseFunctions.Update);
app.MapDelete("/v1/recurring-expenses/{id:guid}", RecurringExpenseFunctions.Delete);

// Profile endpoints
app.MapGet("/v1/profile", ProfileFunctions.Get);
app.MapPut("/v1/profile", ProfileFunctions.Update);

// Analytics endpoints
app.MapGet("/v1/analytics", AnalyticsFunctions.Get);
app.MapGet("/v1/analytics/expenses", AnalyticsFunctions.GetExpenses);

// Bank integration endpoints
app.MapGet("/v1/bank/aspsps", BankFunctions.GetAspsps);
app.MapGet("/v1/bank/connections", BankFunctions.GetConnections);
app.MapPost("/v1/bank/connections", BankFunctions.StartConnection);
app.MapPost("/v1/bank/connections/complete", BankFunctions.CompleteConnection);
app.MapDelete("/v1/bank/connections/{id:guid}", BankFunctions.DeleteConnection);
app.MapPatch("/v1/bank/accounts/{id:guid}", BankFunctions.UpdateAccount);
app.MapPost("/v1/bank/sync", BankFunctions.Sync);
app.MapGet("/v1/bank/ai-jobs/{jobId:guid}", BankFunctions.GetAiJob);
app.MapGet("/v1/bank/transactions", BankFunctions.GetTransactions);
app.MapGet("/v1/bank/transactions/pending-count", BankFunctions.GetPendingCount);
app.MapPost("/v1/bank/transactions/accept-bulk", BankFunctions.AcceptBulk);
app.MapPost("/v1/bank/transactions/{id:guid}/accept", BankFunctions.Accept);
app.MapPost("/v1/bank/transactions/{id:guid}/dismiss", BankFunctions.Dismiss);
app.MapPost("/v1/bank/transactions/{id:guid}/link", BankFunctions.Link);
app.MapPost("/v1/bank/notifications", BankFunctions.UploadNotifications);

app.Run();

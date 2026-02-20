using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Infrastructure.Repositories;
using HowAreMyFinances.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// AWS Lambda hosting
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Configuration
builder.Services
    .AddOptions<SupabaseSettings>()
    .BindConfiguration(SupabaseSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

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
app.MapGet("/v1/expenses/vendors", ExpenseFunctions.GetVendors);
app.MapPut("/v1/expenses/{id:guid}", ExpenseFunctions.Update);
app.MapDelete("/v1/expenses/{id:guid}", ExpenseFunctions.Delete);

// Income endpoints
app.MapGet("/v1/months/{monthId:guid}/incomes", IncomeFunctions.GetAll);
app.MapPost("/v1/months/{monthId:guid}/incomes", IncomeFunctions.Create);
app.MapPut("/v1/incomes/{id:guid}", IncomeFunctions.Update);
app.MapDelete("/v1/incomes/{id:guid}", IncomeFunctions.Delete);

// Category endpoints
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

app.Run();

namespace HowAreMyFinances.Api.Domain;

public sealed class CategoryEntity
{
    public string Name { get; }

    private CategoryEntity(string name)
    {
        Name = name;
    }

    public static Result<CategoryEntity> ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return Result<CategoryEntity>.Failure("Category name is required");

        return Result<CategoryEntity>.Success(new CategoryEntity(name.Trim()));
    }
}

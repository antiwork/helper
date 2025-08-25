import { describe, expect, test } from "vitest";
import { getInitials } from "@/components/utils/initials";

describe("getInitials", () => {
  test("handles various name formats and edge cases", () => {
    // Full names
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("john doe")).toBe("JD");
    expect(getInitials("jOhN dOe")).toBe("JD");
    
    // Single name
    expect(getInitials("John")).toBe("J");
    
    // Multiple names (only first two)
    expect(getInitials("John Michael Doe")).toBe("JM");
    
    // Empty and whitespace
    expect(getInitials("")).toBe("AN");
    expect(getInitials("   ")).toBe("AN");
    
    // Extra whitespace handling
    expect(getInitials("John  Doe")).toBe("JD");
    expect(getInitials("  John   Doe  ")).toBe("JD");
    
    // Special characters
    expect(getInitials("Jean-Pierre François")).toBe("JF");
    expect(getInitials("O'Connor Smith")).toBe("OS");
  });
});
import { render, screen } from "@testing-library/react";
import { UserCard } from "@/components/shared/user-card";
import "@testing-library/jest-dom";

describe("UserCard Component", () => {
  const defaultProps = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date().toISOString(),
  };

  it("should have 'relative' class for correct badge positioning", () => {
    const { container } = render(
      <UserCard {...defaultProps} isCurrentUser={true} />
    );
    // The Card component is the first child of the container
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass("relative");
  });

  it("should display 'Você' badge when isCurrentUser is true", () => {
    render(<UserCard {...defaultProps} isCurrentUser={true} />);
    const badge = screen.getByText("Você");
    expect(badge).toBeInTheDocument();
  });

  it("should NOT display 'Você' badge when isCurrentUser is false", () => {
    render(<UserCard {...defaultProps} isCurrentUser={false} />);
    const badge = screen.queryByText("Você");
    expect(badge).not.toBeInTheDocument();
  });
});

//Fuction to get current day in Slovak
  export function getCurrentDaySlovak(): string {
    const daysMap: { [key: number]: string } = {
      0: "Nedeľa",
      1: "Pondelok",
      2: "Utorok",
      3: "Streda",
      4: "Štvrtok",
      5: "Piatok",
      6: "Sobota",
    };

    const today = new Date().getDay();
    return daysMap[today];
  };


//Function to get membership status class
export function getMembershipStatus(user?: "basic" | "premium" | "trainer"): string {
  if (!user) return "text-gray-500";
  
  switch(user){
    case "premium":
      return "text-yellow-600 font-semibold";
    case "basic":
      return "text-gray-500";
    case "trainer":
      return "text-green-600 font-semibold";
    default:
      return "text-gray-500";
  }
}

// Function to get color based on meal type
export function getMealTypeColor(mealType: string): string {
    
    const normalizedType = mealType.toLowerCase();
    switch (normalizedType) {
      case "breakfast":
        return "bg-eatrivo-blue";
      case "snack":
        return "bg-eatrivo-green";
      case "lunch":
        return "bg-eatrivo-yellow";
      case "dinner":
        return "bg-eatrivo-red";
      default:
        return "bg-gray-500";
    }
  }
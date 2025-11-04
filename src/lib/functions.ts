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
      case "raňajky":
        return "bg-eatrivo-green";
      case "desiata":
        return "bg-eatrivo-blue";
      case "obed":
        return "bg-eatrivo-yellow";
      case "olovrant":
        return "bg-eatrivo-orange";
      case "večera":
        return "bg-eatrivo-red";
      default:
        return "bg-gray-500";
    }
  }



    export function getAgeFromDate(dateOfBirth: string | Date): number {
    const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
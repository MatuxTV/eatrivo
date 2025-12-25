//Function to get current day in Slovak or English
export function getCurrentDay(locale: string = 'sk'): string {
  const daysMap: { [key: string]: { [key: number]: string } } = {
    sk: {
      0: "Nedeľa",
      1: "Pondelok",
      2: "Utorok",
      3: "Streda",
      4: "Štvrtok",
      5: "Piatok",
      6: "Sobota",
    },
    en: {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
    },
  };

  const today = new Date().getDay();
  return daysMap[locale]?.[today] || daysMap['en'][today];
};

export function getDayIndex(dayName: string): number {
  const normalized = dayName.toLowerCase().trim();
  const map: { [key: string]: number } = {
    "nedeľa": 0, "sunday": 0,
    "pondelok": 1, "monday": 1,
    "utorok": 2, "tuesday": 2,
    "streda": 3, "wednesday": 3,
    "štvrtok": 4, "thursday": 4,
    "piatok": 5, "friday": 5,
    "sobota": 6, "saturday": 6
  };
  return map[normalized] ?? -1;
}


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
        case "breakfast":
        return "bg-eatrivo-green";
      case "brunch":
        return "bg-eatrivo-blue";
      case "lunch":
        return "bg-eatrivo-yellow";
      case "snack":
        return "bg-eatrivo-orange";
      case "dinner":
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

  export function roundNumber(num: number | string): number {
    
    if (typeof num === 'string') {
      const parsed = parseFloat(num.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : Math.round(parsed);
    }
    return isNaN(num) ? 0 : Math.round(num);
  }

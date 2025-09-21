import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Clock, Star } from "lucide-react"

interface ReceiptCardProps {
  icon?: React.ReactNode
  title: string
  description: string
  difficulty: string
  cookTime: string
  calories: number
  protein: number
  carbs: number
  fat: number
  type: string
  onViewRecipe?: () => void
}

export default function ReceiptCard({
  icon,
  title,
  description,
  difficulty,
  cookTime,
  calories,
  protein,
  carbs,
  fat,
  type,
  onViewRecipe
}: ReceiptCardProps) {

  // Function to get color based on meal type
  const getMealTypeColor = (mealType: string): string => {
    console.log("Determining color for meal type:", mealType);
    const normalizedType = mealType.toLowerCase();
    switch(normalizedType){
        case "breakfast":
          return 'bg-eatrivo-blue';
        case "lunch":
          return 'bg-eatrivo-yellow';
        case "dinner":
          return 'bg-eatrivo-red';
        default:
          return 'bg-gray-500';
    }
  };
    
  return (
    <Card className="max-w-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-16 h-16 ${getMealTypeColor(type)} rounded-2xl flex items-center justify-center flex-shrink-0`}>
            {icon || (
              <Star className="w-8 h-8 text-white" />
            )}
          </div>
          
          {/* Title and Description */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tags */}
        <div className="flex gap-2">
          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100">
            <Star className="w-3 h-3 mr-1" />
            {difficulty}
          </Badge>
          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100">
            <Clock className="w-3 h-3 mr-1" />
            {cookTime}
          </Badge>
        </div>

        {/* Nutrition Info */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-6">
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Kalórie:</span>
            <span className="font-medium text-gray-900">{calories}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Proteíny:</span>
            <span className="font-medium text-gray-900">{protein}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Sacharidy:</span>
            <span className="font-medium text-gray-900">{carbs}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Tuky:</span>
            <span className="font-medium text-gray-900">{fat}g</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={onViewRecipe}
          className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white"
          size="lg"
        >
          Zobraziť recept
        </Button>
      </CardContent>
    </Card>
  )
}
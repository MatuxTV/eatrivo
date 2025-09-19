import { auth } from "../../../../auth"
import { redirect } from "next/navigation"
import { signOut } from "../../../../auth"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/signin")
  }

  async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/" })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Vitajte späť, {session.user.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Vaš profil je už nastavený
              </p>
            </div>
            <form action={handleSignOut}>
              <button 
                type="submit"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Odhlásiť sa
              </button>
            </form>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Objednávky</h3>
              <p className="text-blue-600">Zobraziť históriu objednávok</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Profil</h3>
              <p className="text-green-600">Upraviť osobné údaje</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">Preferencie</h3>
              <p className="text-purple-600">Zmeniť stravovacie preferencie</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

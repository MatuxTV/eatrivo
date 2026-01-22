# Admin Dashboard - Modulárna Štruktúra

##  Štruktúra Komponentov

\\\
src/app/admin/components/
 AdminDashboard.tsx          # Hlavný container komponent
 types.ts                     # Zdieľané TypeScript typy
 shared/                      # Zdieľané komponenty
    AdminHeader.tsx         # Header s názvom a beta oznakom
    AdminTabs.tsx           # Navigačné záložky
    StatsCard.tsx           # Štatistická karta používateľov
    UserInfoCard.tsx        # Kompaktná info karta o používateľovi
 tabs/                        # Jednotlivé záložky
     ShoppingListTab.tsx     # Vytvorenie nákupného zoznamu
     UsersTab.tsx            # Zoznam používateľov
     ProfilesTab.tsx         # Detailné profily
     EmailsTab.tsx           # Odosielanie emailov
\\\

##  Výhody Modularity

### 1. **Lepšia Čitateľnosť**
- Každý komponent má jasnú zodpovednosť
- Ľahšie navigovanie v kóde
- Menšie súbory (200-300 riadkov vs 2000+)

### 2. **Znovupoužiteľnosť**
- \UserInfoCard\ - použiteľná kdekoľvek potrebujeme zobraziť user info
- \StatsCard\ - použiteľná na rôznych dashboardoch
- \AdminHeader\ - konzistentný header naprieč admin sekciou

### 3. **Ľahšia Údržba**
- Bug v jednej funkcii = oprava v jednom súbore
- Izolované testovanie komponentov
- Jednoduchšie code reviews

### 4. **Lepšia Performance**
- Menšie bundle sizes
- Možnosť lazy loadingu jednotlivých tabov
- React re-renders len potrebných častí

##  Použitie

### AdminDashboard (Hlavný Komponent)

\\\	sx
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [users, setUsers] = useState<User[]>([]);
  // ... state management

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AdminHeader />
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <AdminTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        <AnimatePresence mode="wait">
          {activeTab === "upload" && <ShoppingListTab ... />}
          {activeTab === "users" && <UsersTab ... />}
          {activeTab === "profiles" && <ProfilesTab ... />}
          {activeTab === "emails" && <EmailsTab ... />}
        </AnimatePresence>
      </div>
    </div>
  );
}
\\\

### UserInfoCard (Zdieľaný Komponent)

\\\	sx
<UserInfoCard 
  userInfo={userInfo} 
  isLoading={isLoadingUserInfo} 
/>
\\\

##  Implementačné Kroky

1.  Vytvorené \	ypes.ts\ - centralizované typy
2.  Vytvorené shared komponenty:
   - AdminHeader
   - AdminTabs  
   - StatsCard
   - UserInfoCard
3.  V procese - Tab komponenty:
   - ShoppingListTab (obsahuje formulár + AI generovanie)
   - UsersTab (zoznam + search + filter)
   - ProfilesTab (detailné zobrazenie)
   - EmailsTab (update emaily)

##  Nasledujúce Kroky

1. Presunúť logiku z AdminDashboard do jednotlivých tabov
2. Vytvoriť custom hooks pre opakované operácie:
   - \useUsers()\ - fetch & manage users
   - \useUserInfo(userId)\ - fetch user details
   - \useShoppingList()\ - CRUD operations
3. Pridať error boundaries pre robustnejšie error handling
4. Implementovať lazy loading pre jednotlivé tabu

##  Best Practices

- **Single Responsibility**: Každý komponent robí jednu vec dobre
- **Props Over State**: Preferuj props passing pred global state kde možno
- **TypeScript**: Silné typovanie pre lepšiu developer experience
- **Naming**: Popisné názvy - \UserInfoCard\, nie \Card1\
- **Co-location**: Súvisiace komponenty sú blízko seba v štruktúre


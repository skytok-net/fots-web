export function Features() {
    const features = [
      {
        title: 'Healthy Meals',
        description: 'Nutritious, balanced meals designed for active professionals',
        icon: '🥗',
      },
      {
        title: 'On-Time Delivery',
        description: 'Reliable delivery to your workplace when you need it',
        icon: '🚚',
      },
      {
        title: 'Local Partners',
        description: 'Supporting local restaurants and food providers',
        icon: '🏪',
      },
    ];
  
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">
            Why Choose FoodOnTheStove?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
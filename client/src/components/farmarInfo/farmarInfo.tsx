import { useState } from "react";
import { IoLocationOutline } from "react-icons/io5";
import { storeData } from "../../constants/storeData";

const FarmerInfo = () => {
  const [selectedStore, setSelectedStore] = useState(storeData[0]);

  return (
    <div className="bg-white py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

        {/* LEFT SIDE */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              You can ask us questions
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500 leading-relaxed">
              Contact us for any questions, feedback, or support. Choose a farm below to see its location on the map.
            </p>
          </div>

          {/* LIST */}
          <div className="flex flex-col gap-4">
            {storeData.map((store) => {
              const isActive = selectedStore.id === store.id;

              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`group cursor-pointer rounded-xl border transition-all duration-300 p-4 sm:p-5 grid grid-cols-5 gap-3
                    ${
                      isActive
                        ? "border-green-500 bg-green-50 shadow-md"
                        : "border-gray-200 hover:border-green-300 hover:shadow-sm"
                    }`}
                >
                  {/* ICON */}
                  <div className="col-span-1 flex justify-center items-start">
                    <div
                      className={`p-3 rounded-full transition-all
                        ${
                          isActive
                            ? "bg-green-100"
                            : "bg-gray-100 group-hover:bg-green-50"
                        }`}
                    >
                      <IoLocationOutline className="text-green-600 text-xl sm:text-2xl" />
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="col-span-4 flex flex-col gap-1">
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                      {store.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {store.address}
                    </p>

                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {store.phone}
                    </p>

                    <button className="text-sm text-green-600 hover:underline w-fit">
                      {store.email}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE - MAP */}
        <div className="lg:col-span-3">
          <div className="sticky top-20">
            <div className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
                 style={{ paddingTop: "70%" }}>
              <iframe
                src={`https://maps.google.com/maps?q=${selectedStore.lat},${selectedStore.lng}&z=15&output=embed`}
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={selectedStore.name}
              />
            </div>

            {/* Selected info under map (mobile-friendly) */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-900">
                {selectedStore.name}
              </h4>
              <p className="text-sm text-gray-500">
                {selectedStore.address}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FarmerInfo;
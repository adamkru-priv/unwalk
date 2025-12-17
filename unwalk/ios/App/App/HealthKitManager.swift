import Foundation
import HealthKit
import Capacitor

class HealthKitManager {
    static let shared = HealthKitManager()
    private let healthStore = HKHealthStore()
    
    func isAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }
    
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(false, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        let typesToRead: Set<HKObjectType> = [stepType]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }
    
    func getSteps(from startDate: Date, to endDate: Date, completion: @escaping (Int?, Error?) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(nil, error)
                    return
                }
                
                guard let result = result, let sum = result.sumQuantity() else {
                    completion(0, nil)
                    return
                }
                
                let steps = Int(sum.doubleValue(for: HKUnit.count()))
                completion(steps, nil)
            }
        }
        
        healthStore.execute(query)
    }
    
    func getTodaySteps(completion: @escaping (Int?, Error?) -> Void) {
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        getSteps(from: startOfDay, to: now, completion: completion)
    }
}

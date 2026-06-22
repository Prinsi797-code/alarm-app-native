//
//  RNStoreKit.swift
//  AlarmApp
//
//  Created by Hevin Technoweb on 18/06/26.
//

import StoreKit

@objc(RNStoreKit)
class RNStoreKit: NSObject {

  // MARK: - Get Products
  @objc func getProducts(
    _ productIds: [String],
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let products = try await Product.products(for: Set(productIds))
        let result = products.map { product -> [String: Any] in
          var map: [String: Any] = [
            "productId": product.id,
            "title": product.displayName,
            "description": product.description,
            "price": "\(product.price)",
            "localizedPrice": product.displayPrice,
            "currency": product.priceFormatStyle.currencyCode ?? "USD",
          ]
          if let sub = product.subscription {
            map["subscriptionPeriod"] = "\(sub.subscriptionPeriod.value) \(sub.subscriptionPeriod.unit)"
          }
          return map
        }
        resolver(result)
      } catch {
        rejecter("GET_PRODUCTS_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Purchase Product
  @objc func purchaseProduct(
    _ productId: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
          rejecter("PRODUCT_NOT_FOUND", "Product not found: \(productId)", nil)
          return
        }

        let result = try await product.purchase()

        switch result {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            await transaction.finish()
            resolver([
              "success": true,
              "transactionId": "\(transaction.id)",
              "productId": transaction.productID,
              "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            ])
          case .unverified(_, let error):
            rejecter("UNVERIFIED_TRANSACTION", error.localizedDescription, error)
          }

        case .userCancelled:
          rejecter("USER_CANCELLED", "User cancelled the purchase", nil)

        case .pending:
          resolver([
            "success": false,
            "pending": true,
            "message": "Purchase is pending approval",
          ])

        @unknown default:
          rejecter("UNKNOWN_RESULT", "Unknown purchase result", nil)
        }

      } catch {
        rejecter("PURCHASE_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Restore Purchases
  @objc func restorePurchases(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        var restored: [[String: Any]] = []

        for await result in Transaction.currentEntitlements {
          switch result {
          case .verified(let transaction):
            restored.append([
              "productId": transaction.productID,
              "transactionId": "\(transaction.id)",
              "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
              "isActive": true,
            ])
          case .unverified:
            break
          }
        }

        resolver(restored)
      } catch {
        rejecter("RESTORE_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Check Subscription Status
  @objc func checkSubscriptionStatus(
    _ productIds: [String],
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        var activeSubscriptions: [[String: Any]] = []

        for await result in Transaction.currentEntitlements {
          switch result {
          case .verified(let transaction):
            if productIds.contains(transaction.productID) {
              var info: [String: Any] = [
                "productId": transaction.productID,
                "transactionId": "\(transaction.id)",
                "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
                "isActive": true,
              ]
              if let expiryDate = transaction.expirationDate {
                info["expiryDate"] = ISO8601DateFormatter().string(from: expiryDate)
                info["isExpired"] = expiryDate < Date()
              }
              activeSubscriptions.append(info)
            }
          case .unverified:
            break
          }
        }

        resolver(activeSubscriptions)
      } catch {
        rejecter("STATUS_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Required for RCT
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

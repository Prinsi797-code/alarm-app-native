//
//  RNStoreKit.m
//  AlarmApp
//
//  Created by Hevin Technoweb on 19/06/26.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNStoreKit, NSObject)

RCT_EXTERN_METHOD(
  getProducts:(NSArray *)productIds
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  purchaseProduct:(NSString *)productId
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  restorePurchases:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  checkSubscriptionStatus:(NSArray *)productIds
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end

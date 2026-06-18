//
//  RNAppIcon.m
//  AlarmApp
//

#import "RNAppIcon.h"
#import <UIKit/UIKit.h>

@implementation RNAppIcon

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(changeIcon:(NSString *)iconName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (![[UIApplication sharedApplication] supportsAlternateIcons]) {
      reject(@"not_supported", @"Alternate icons not supported", nil);
      return;
    }

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)),
                   dispatch_get_main_queue(), ^{

      NSString *icon = [iconName isEqualToString:@"Default"] ? nil : iconName;

      [[UIApplication sharedApplication] setAlternateIconName:icon completionHandler:^(NSError *error) {
        if (error) {
          NSLog(@"[RNAppIcon] ERROR code=%ld desc=%@", (long)error.code, error.localizedDescription);
          if (error.code == 3072 ||
              [error.localizedDescription containsString:@"temporarily unavailable"] ||
              [error.localizedDescription containsString:@"cancelled"]) {
            resolve(iconName);
          } else {
            NSLog(@"[RNAppIcon] SUCCESS — icon set to: %@", iconName);
            reject(@"icon_error", error.localizedDescription, error);
          }
        } else {
          NSLog(@"[RNAppIcon] SUCCESS — icon to: %@", iconName);
          resolve(iconName);
        }
      }];

    });
  });
}

RCT_EXPORT_METHOD(getIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *icon = [UIApplication sharedApplication].alternateIconName;
    resolve(icon ? icon : @"Default");
  });
}

@end
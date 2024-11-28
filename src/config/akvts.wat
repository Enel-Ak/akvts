(module
  ;; ...existing code...

  ;; 定义内存
  (memory $memory 1)
  ;; 导出内存以便 JavaScript 可以访问
  (export "_0xAK97" (memory $memory))

  ;; 在内存中存储预设字符，保留在偏移量 0
  (data (i32.const 0) "jLV4CS$&&u98$h") ;; 预设字符存储在偏移量 0

  ;; 定义全局变量存储过期时间（例如 Unix 时间戳）
  (global $expiryTime (mut i64) (i64.const 1735603200)) ;; 设置过期时间 Math.floor(new Date('2024-12-31') / 1000) , wat2wasm akvts.wat -o akvts.wasm

  ;; 导出校验函数
  (func (export "_0xAK98") (param $inputPtr i32) (param $currentTime i64) (result i32)
    ;; 初始化 isEqual 为 1
    (local $isEqual i32)
    (local $timeValid i32)
    (local $isLengthValid i32) ;; 新增本地变量
    (local.set $isEqual (i32.const 1))

    ;; 逐字节比较输入字符串和预设字符串
    ;; 比较字节0到字节13
    (local.set $isEqual
      (i32.and
        (i32.eq
          (i32.load8_u (local.get $inputPtr))          ;; 输入的字节0
          (i32.load8_u (i32.const 0))                  ;; 预设的字节0
        )
        (i32.and
          (i32.eq
            (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 1))) ;; 输入的字节1
            (i32.load8_u (i32.const 1))                                  ;; 预设的字节1
          )
          (i32.and
            (i32.eq
              (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 2))) ;; 输入的字节2
              (i32.load8_u (i32.const 2))                                  ;; 预设的字节2
            )
            (i32.and
              (i32.eq
                (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 3))) ;; 输入的字节3
                (i32.load8_u (i32.const 3))                                  ;; 预设的字节3
              )
              (i32.and
                (i32.eq
                  (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 4))) ;; 输入的字节4
                  (i32.load8_u (i32.const 4))                                  ;; 预设的字节4
                )
                (i32.and
                  (i32.eq
                    (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 5))) ;; 输入的字节5
                    (i32.load8_u (i32.const 5))                                  ;; 预设的字节5
                  )
                  (i32.and
                    (i32.eq
                      (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 6))) ;; 输入的字节6
                      (i32.load8_u (i32.const 6))                                  ;; 预设的字节6
                    )
                    (i32.and
                      (i32.eq
                        (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 7))) ;; 输入的字节7
                        (i32.load8_u (i32.const 7))                                  ;; 预设的字节7
                      )
                      (i32.and
                        (i32.eq
                          (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 8))) ;; 输入的字节8
                          (i32.load8_u (i32.const 8))                                  ;; 预设的字节8
                        )
                        (i32.and
                          (i32.eq
                            (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 9))) ;; 输入的字节9
                            (i32.load8_u (i32.const 9))                                  ;; 预设的字节9
                          )
                          (i32.and
                            (i32.eq
                              (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 10))) ;; 输入的字节10
                              (i32.load8_u (i32.const 10))                                  ;; 预设的字节10
                            )
                            (i32.and
                              (i32.eq
                                (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 11))) ;; 输入的字节11
                                (i32.load8_u (i32.const 11))                                  ;; 预设的字节11
                              )
                              (i32.and
                                (i32.eq
                                  (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 12))) ;; 输入的字节12
                                  (i32.load8_u (i32.const 12))                                  ;; 预设的字节12
                                )
                                (i32.eq
                                  (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 13))) ;; 输入的字节13
                                  (i32.load8_u (i32.const 13))                                  ;; 预设的字节13
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )

    ;; 检查字符串长度是否为14
    (local.set $isLengthValid
      (i32.eq
        (i32.load8_u (i32.add (local.get $inputPtr) (i32.const 14))) ;; 输入的字节14
        (i32.const 0)                                                ;; 期望为0（字符串结束符）
      )
    )

    ;; 判断时间是否未过期
    (local.set $timeValid
      (i32.eq
        (i64.lt_s (local.get $currentTime) (global.get $expiryTime))
        (i32.const 1)
      )
    )

    ;; 返回校验结果：字符串全等且长度为14且未过期返回 1，否则返回 0
    (i32.and
      (i32.and (local.get $isEqual) (local.get $isLengthValid))
      (local.get $timeValid)
    )
  )

  ;; ...existing code...
)

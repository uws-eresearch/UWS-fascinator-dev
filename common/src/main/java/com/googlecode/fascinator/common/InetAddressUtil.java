/* 
 * The Fascinator - Common Library
 * Copyright (C) 2008-2009 University of Southern Queensland
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 * 
 * Original source: http://lenya.apache.org/
 */
package com.googlecode.fascinator.common;

import java.net.InetAddress;
import java.net.UnknownHostException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * A utility class for InetAddress. Also see http://jodies.de/ipcalc
 */
public class InetAddressUtil {

    /** Logging */
    private static final Logger log = LoggerFactory
            .getLogger(InetAddressUtil.class);

    /**
     * Constructor
     */
    private InetAddressUtil() {
        // do nothing
    }

    /**
     * Checks if a subnet contains a specific IP address.
     * 
     * @param network The network address.
     * @param netmask The subnet mask.
     * @param ip The IP address to check.
     * @return <code>true</code> if the masked network and ip addresses match,
     *         <code>false</code> otherwise
     */
    public static boolean contains(InetAddress network, InetAddress netmask,
            InetAddress ip) {
        if (log.isDebugEnabled()) {
            log.debug("=======================================");
            log.debug("Checking IP address: " + ip + " in " + network + " / "
                    + netmask);
        }

        byte[] networkBytes = network.getAddress();
        byte[] netmaskBytes = netmask.getAddress();
        byte[] ipBytes = ip.getAddress();

        /* check IPv4/v6-compatibility or parameters: */
        if (networkBytes.length != netmaskBytes.length
                || netmaskBytes.length != ipBytes.length) {
            /*
             * FIXME: If network and netmask have the same size should already
             * be checked whenever org.apache.lenya.ac.(impl.Abstract)IPRange is
             * set. In that case the user should be notified of this
             * configuration-error instead of silently accepting the buggy
             * IPRange as one not matching any host! (Note that changes to the
             * public API of IPRange and other classes would be necessary to fix
             * this problem. This method and therefore this whole class would
             * probably be obsolete in that case.)
             */
            if (log.isDebugEnabled()) {
                log.debug("Network address " + network + ", subnet mask "
                        + netmask + " and/or host address " + ip
                        + " have different sizes! (return false ...)");
                log.debug("=======================================");
            }
            return false;
        }

        /* Check if the masked network and ip addresses match: */
        for (int i = 0; i < netmaskBytes.length; i++) {
            int mask = netmaskBytes[i] & 0xff;
            if ((networkBytes[i] & mask) != (ipBytes[i] & mask)) {
                if (log.isDebugEnabled()) {
                    log.debug(ip + " is not in " + network + " / " + netmask);
                    log.debug("=======================================");
                }
                return false;
            }
        }
        if (log.isDebugEnabled()) {
            log.debug(ip + " is in " + network + " / " + netmask);
            log.debug("=======================================");
        }
        return true;
    }

    /**
     * Returns the n-th part of an InetAddress.
     * 
     * @param ip The address.
     * @param partNumber The number of the part.
     * @return An integer value.
     * @deprecated This was an internal implementation detail of the method
     *             {@link #contains} and should never have been made public.
     *             (And it's inefficient and unnecessary too, as well as broken
     *             for IPv6. ;-) Use <code>ip.getAddress()[partNumber]</code>
     *             instead.
     */
    @Deprecated
    public static int getClassPart(InetAddress ip, int partNumber) {
        String[] parts = ip.getHostAddress().split("\\.");
        String part = parts[partNumber];
        return new Integer(part).intValue();
    }

    /**
     * Check netmask, e.g. 255.255.255.240 is fine, 255.255.240.16 is illegal
     * (needs to be 255.255.240.0)
     * 
     * @param netmask The netmask address.
     * @return An integer value. -1 if illegal netmask, otherwise 0, 1, 2, 3
     * @deprecated This was an internal implementation detail of the method
     *             {@link #contains} and should never have been made public.
     *             Furthermore it's broken for IPv6. (However, there is no real
     *             replacement. If you need this functionality, you should
     *             rewrite it yourself.)
     */
    @Deprecated
    public static int checkNetmask(InetAddress netmask) {
        String[] parts = netmask.getHostAddress().split("\\.");
        Integer[] numbers = new Integer[4];
        for (int i = 0; i < 4; i++) {
            numbers[i] = new Integer(parts[i]);
        }

        for (int i = 0; i < 4; i++) {
            log.debug(".checkNetmask(): Check part: " + numbers[i]);
            if (0 <= numbers[i].intValue() && numbers[i].intValue() <= 255) {
                if (numbers[i].intValue() != 255) {
                    for (int k = i + 1; k < 4; k++) {
                        if (numbers[k].intValue() != 0) {
                            log.error(".checkNetmask(): Illegal Netmask: "
                                    + netmask);
                            return -1;
                        }
                    }
                    return i;
                }
                continue;
            }
            // FIXME: This check not really be necessary because
            // java.net.UnknownHostException should be thrown long time before
            log.error(".checkNetmask(): Illegal Netmask: " + netmask);
            return -1;
        }
        if (log.isDebugEnabled()) {
            log.debug("All parts equal 255: " + netmask);
        }
        return 3;
    }

    /**
     * Converts a string to an IP addres.
     * 
     * @param string The IP address, represented by a string.
     * @return An InetAddress object.
     * @throws UnknownHostException
     * @deprecated This was an internal implementation detail of the method
     *             {@link #contains} and should never have been made public.
     *             (And it's unnecessary too, as well as broken for IPv6. ;-)
     *             Use <code>InetAddress.getByName(string)</code> instead.
     */
    @Deprecated
    public static InetAddress getAddress(String string)
            throws UnknownHostException {
        String[] strings = string.split("\\.");

        InetAddress address;
        byte[] numbers = new byte[strings.length];
        for (int i = 0; i < strings.length; i++) {
            int number = Integer.parseInt(strings[i]);
            if (number > 127) {
                number = number - 256;
            }
            numbers[i] = (byte) number;
        }

        address = InetAddress.getByAddress(numbers);
        return address;
    }

}
